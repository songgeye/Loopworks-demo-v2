require "test_helper"
require "roo"
require "zip"

module Api
  module V1
    class ProductionRecordsControllerTest < ActionDispatch::IntegrationTest
      include Devise::Test::IntegrationHelpers

      setup do
        @staff = Staff.create!(username: "signed_in_#{SecureRandom.hex(4)}", name: "ログイン担当",
                                role: "staff", password: "password1234")

        @iron = Material.create!(name: "鉄スクラップ_#{SecureRandom.hex(4)}", display_order: 1)
        @copper = Material.create!(name: "銅線_#{SecureRandom.hex(4)}", display_order: 2)
        @worker_a = Staff.create!(username: "worker_a_#{SecureRandom.hex(4)}", name: "作業者A",
                                   role: "staff", password: "password1234")
        @worker_b = Staff.create!(username: "worker_b_#{SecureRandom.hex(4)}", name: "作業者B",
                                   role: "staff", password: "password1234")

        @in_range = ProductionRecord.create!(
          recorded_at: Time.zone.parse("2026-08-10 14:32:00"),
          material: @iron, staff: @worker_a, weight_kg: 12.5, status: "published"
        )
        @out_of_range = ProductionRecord.create!(
          recorded_at: Time.zone.parse("2026-01-01 09:00:00"),
          material: @copper, staff: @worker_b, weight_kg: 3.4, status: "published"
        )
      end

      test "未認証の場合は401が返り、伝票の保存等は行われない" do
        get "/api/v1/production_records.xlsx"

        assert_response :unauthorized
        body = JSON.parse(response.body)
        assert body["errors"].present?
      end

      test "from/toの絞り込みが反映される" do
        sign_in @staff

        get "/api/v1/production_records.xlsx", params: { from: "2026-08-01", to: "2026-08-31" }
        assert_response :success

        workbook = open_workbook(response.body)
        sheet = workbook.sheet("生産記録")
        material_column = (2..sheet.last_row - 1).map { |row| sheet.cell(row, 2) }

        assert_includes material_column, @iron.name
        refute_includes material_column, @copper.name
      end

      test "material_idの絞り込みが反映される" do
        sign_in @staff

        get "/api/v1/production_records.xlsx", params: { material_id: @copper.id }
        assert_response :success

        workbook = open_workbook(response.body)
        sheet = workbook.sheet("生産記録")
        material_column = (2..sheet.last_row - 1).map { |row| sheet.cell(row, 2) }

        assert_equal [ @copper.name ], material_column
      end

      test "staff_idの絞り込みが反映される" do
        sign_in @staff

        get "/api/v1/production_records.xlsx", params: { staff_id: @worker_b.id }
        assert_response :success

        workbook = open_workbook(response.body)
        sheet = workbook.sheet("生産記録")
        staff_column = (2..sheet.last_row - 1).map { |row| sheet.cell(row, 3) }

        assert_equal [ @worker_b.name ], staff_column
      end

      test "不正な日付を渡すと422でエラーが返る" do
        sign_in @staff

        get "/api/v1/production_records.xlsx", params: { from: "not-a-date" }
        assert_response :unprocessable_entity
        body = JSON.parse(response.body)
        assert_equal "from", body["errors"].first["field"]
      end

      test "生成したxlsxを読み戻すと記録日時がJSTとして解釈される" do
        sign_in @staff

        get "/api/v1/production_records.xlsx", params: { material_id: @iron.id }
        assert_response :success

        workbook = open_workbook(response.body)
        sheet = workbook.sheet("生産記録")
        recorded_at_cell = sheet.cell(2, 1)

        assert_equal "2026-08-10 14:32", recorded_at_cell.strftime("%Y-%m-%d %H:%M")
      end

      test "実測kgのセルが数値型である" do
        sign_in @staff

        get "/api/v1/production_records.xlsx", params: { material_id: @iron.id }
        assert_response :success

        workbook = open_workbook(response.body)
        sheet = workbook.sheet("生産記録")
        weight_cell = sheet.cell(2, 4)

        assert_kind_of Numeric, weight_cell
        assert_in_delta 12.5, weight_cell, 0.001
      end

      test "合計行が数式として入っている" do
        sign_in @staff

        get "/api/v1/production_records.xlsx"
        assert_response :success

        sheet_xml = sheet_xml_for(response.body, "生産記録")
        formula = sheet_xml.at_xpath("//xmlns:row[@r='4']/xmlns:c[@r='D4']/xmlns:f")

        assert formula, "合計行(D4)に数式が入っていること"
        assert_equal "SUM(D2:D3)", formula.text
      end

      test "品目別集計シートで同一マテリアルの複数梱包が合算される" do
        sign_in @staff
        ProductionRecord.create!(
          recorded_at: Time.zone.parse("2026-08-11 09:00:00"),
          material: @iron, staff: @worker_b, weight_kg: 7.5, status: "published"
        )

        get "/api/v1/production_records.xlsx", params: { from: "2026-08-01", to: "2026-08-31" }
        assert_response :success

        workbook = open_workbook(response.body)
        sheet = workbook.sheet("品目別集計")
        row = (2..sheet.last_row).map { |r| [ sheet.cell(r, 1), sheet.cell(r, 2), sheet.cell(r, 3) ] }
                                 .find { |name, *| name == @iron.name }

        assert_equal 20.0, row[1]
        assert_equal 2, row[2]
      end

      test "日本語ファイル名でダウンロードされる(RFC 5987)" do
        sign_in @staff

        travel_to Time.zone.parse("2026-08-21 10:00:00") do
          get "/api/v1/production_records.xlsx", params: { from: "2026-08-01", to: "2026-08-21" }
        end
        assert_response :success

        disposition = response.headers["Content-Disposition"]
        assert_match(/filename\*=UTF-8''/, disposition)

        encoded = disposition[/filename\*=UTF-8''([^;]+)/, 1]
        assert_equal "生産記録_20260801-20260821.xlsx", CGI.unescape(encoded)
      end

      test "1000件のエクスポートでN+1が発生しない" do
        sign_in @staff

        materials = Array.new(5) { |i| Material.create!(name: "M#{i}_#{SecureRandom.hex(4)}", display_order: i + 10) }
        staffs = Array.new(5) { |i| Staff.create!(username: "bulk_#{i}_#{SecureRandom.hex(4)}", name: "B#{i}", role: "staff", password: "password1234") }

        now = Time.zone.now
        rows = Array.new(1000) do |i|
          {
            recorded_at: Time.zone.parse("2026-08-15 10:00:00") + i.minutes,
            material_id: materials[i % materials.size].id,
            staff_id: staffs[i % staffs.size].id,
            weight_kg: 1.0,
            status: "published",
            flagged_as_anomaly: false,
            created_at: now,
            updated_at: now
          }
        end
        ProductionRecord.insert_all!(rows)

        query_count = 0
        callback = ->(*, payload) { query_count += 1 unless payload[:name] == "SCHEMA" }
        ActiveSupport::Notifications.subscribed(callback, "sql.active_record") do
          get "/api/v1/production_records.xlsx"
        end

        assert_response :success
        assert_operator query_count, :<, 10,
                        "includes が効いていれば record 数に比例したクエリは発生しないはず(実行数: #{query_count})"
      end

      private

      def open_workbook(binary)
        file = Tempfile.new([ "production_records", ".xlsx" ])
        file.binmode
        file.write(binary)
        file.flush
        Roo::Excelx.new(file.path)
      end

      def sheet_xml_for(binary, sheet_name)
        file = Tempfile.new([ "production_records", ".xlsx" ])
        file.binmode
        file.write(binary)
        file.flush

        workbook = open_workbook(binary)
        index = workbook.sheets.index(sheet_name)

        Zip::File.open(file.path) do |zip|
          entry = zip.glob("xl/worksheets/sheet#{index + 1}.xml").first
          return Nokogiri::XML(entry.get_input_stream.read)
        end
      end
    end
  end
end
