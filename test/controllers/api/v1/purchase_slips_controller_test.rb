require "test_helper"

module Api
  module V1
    class PurchaseSlipsControllerTest < ActionDispatch::IntegrationTest
      include Devise::Test::IntegrationHelpers

      setup do
        @staff = Staff.create!(username: "signed_in_#{SecureRandom.hex(4)}", name: "ログイン担当",
                                role: "staff", password: "password1234")
        @company = Company.create!(name: "〇〇株式会社_#{SecureRandom.hex(4)}", supplier: true)
        @iron = Material.create!(name: "鉄スクラップ_#{SecureRandom.hex(4)}", display_order: 1, category: :stock)
        @copper = Material.create!(name: "銅線_#{SecureRandom.hex(4)}", display_order: 2, category: :stock)
        @waste = Material.create!(name: "木くず_#{SecureRandom.hex(4)}", display_order: 3, category: :disposal)
        @worker = Staff.create!(username: "worker_#{SecureRandom.hex(4)}", name: "作業者A",
                                 role: "staff", password: "password1234")
      end

      test "未認証の場合は401が返る" do
        get "/api/v1/purchase_slips"
        assert_response :unauthorized
      end

      test "伝票を作成せずに生産記録を登録できる" do
        record = ProductionRecord.create!(
          recorded_at: Time.zone.now, material: @iron, staff: @worker, weight_kg: 5.0, status: "published"
        )
        assert_nil record.purchase_slip_id
      end

      test "declared_total_kgを空欄のまま伝票を作成でき、差分系の値はすべてnullで返る" do
        sign_in @staff

        post "/api/v1/purchase_slips", params: {
          purchase_slip: { company_id: @company.id, received_at: Time.zone.now.iso8601 }
        }
        assert_response :created

        body = JSON.parse(response.body)
        assert_nil body["declared_total_kg"]
        assert_nil body["variance_kg"]
        assert_nil body["variance_rate"]
        assert_equal false, body["variance_alert"]
      end

      test "1つの伝票に複数の生産記録を紐づけられ、material_subtotalsで合算される" do
        sign_in @staff
        slip = PurchaseSlip.create!(company: @company, received_at: Time.zone.now, declared_total_kg: 100.0)

        ProductionRecord.create!(recorded_at: Time.zone.now, material: @iron, staff: @worker, weight_kg: 40, purchase_slip: slip, status: "published")
        ProductionRecord.create!(recorded_at: Time.zone.now, material: @iron, staff: @worker, weight_kg: 20, purchase_slip: slip, status: "published")
        ProductionRecord.create!(recorded_at: Time.zone.now, material: @copper, staff: @worker, weight_kg: 30, purchase_slip: slip, status: "published")
        ProductionRecord.create!(recorded_at: Time.zone.now, material: @waste, staff: @worker, weight_kg: 10, purchase_slip: slip, status: "published")

        get "/api/v1/purchase_slips/#{slip.id}"
        assert_response :success
        body = JSON.parse(response.body)

        assert_equal 4, body["production_records"].size

        iron_subtotal = body["material_subtotals"].find { |s| s["material"]["id"] == @iron.id }
        assert_equal 60.0, iron_subtotal["quantity_kg"]
        assert_equal 2, iron_subtotal["count"]

        # 鉄60 / 銅30 / 廃棄10 を先方申告100kgと比較 -> 差分0（実装仕様書 v2 §4.4）
        assert_equal 100.0, body["actual_total_kg"]
        assert_equal 0.0, body["variance_kg"]
        assert_equal false, body["variance_alert"]
      end

      test "disposal区分の生産記録がactual_total_kgに含まれるが在庫関連には現れない" do
        sign_in @staff
        slip = PurchaseSlip.create!(company: @company, received_at: Time.zone.now, declared_total_kg: 10.0)
        ProductionRecord.create!(recorded_at: Time.zone.now, material: @waste, staff: @worker, weight_kg: 10, purchase_slip: slip, status: "published")

        get "/api/v1/purchase_slips/#{slip.id}"
        body = JSON.parse(response.body)

        assert_equal 10.0, body["actual_total_kg"]
        assert_equal 0.0, body["variance_kg"]
      end

      test "紐づく生産記録を編集すると差分が自動的に再計算される" do
        sign_in @staff
        slip = PurchaseSlip.create!(company: @company, received_at: Time.zone.now, declared_total_kg: 100.0)
        record = ProductionRecord.create!(recorded_at: Time.zone.now, material: @iron, staff: @worker, weight_kg: 100, purchase_slip: slip, status: "published")

        get "/api/v1/purchase_slips/#{slip.id}"
        assert_equal 0.0, JSON.parse(response.body)["variance_kg"]

        record.update!(weight_kg: 110)

        get "/api/v1/purchase_slips/#{slip.id}"
        assert_equal 10.0, JSON.parse(response.body)["variance_kg"]
      end

      test "差分率の絶対値が閾値を超えるとvariance_alertがtrueになる" do
        sign_in @staff
        slip = PurchaseSlip.create!(company: @company, received_at: Time.zone.now, declared_total_kg: 100.0)
        ProductionRecord.create!(recorded_at: Time.zone.now, material: @iron, staff: @worker, weight_kg: 96.0, purchase_slip: slip, status: "published")

        get "/api/v1/purchase_slips/#{slip.id}"
        body = JSON.parse(response.body)
        assert_equal(-4.0, body["variance_rate"])
        assert_equal true, body["variance_alert"]
      end

      test "差分率が閾値以下の場合はvariance_alertがfalse" do
        sign_in @staff
        slip = PurchaseSlip.create!(company: @company, received_at: Time.zone.now, declared_total_kg: 100.0)
        ProductionRecord.create!(recorded_at: Time.zone.now, material: @iron, staff: @worker, weight_kg: 98.0, purchase_slip: slip, status: "published")

        get "/api/v1/purchase_slips/#{slip.id}"
        assert_equal false, JSON.parse(response.body)["variance_alert"]
      end

      test "伝票一覧でN+1が発生しない" do
        sign_in @staff
        companies = Array.new(5) { |i| Company.create!(name: "会社#{i}_#{SecureRandom.hex(4)}", supplier: true) }
        30.times do |i|
          slip = PurchaseSlip.create!(company: companies[i % companies.size], received_at: Time.zone.now, declared_total_kg: 10.0)
          ProductionRecord.create!(recorded_at: Time.zone.now, material: @iron, staff: @worker, weight_kg: 5, purchase_slip: slip, status: "published")
        end

        query_count = 0
        callback = ->(*, payload) { query_count += 1 unless payload[:name] == "SCHEMA" }
        ActiveSupport::Notifications.subscribed(callback, "sql.active_record") do
          get "/api/v1/purchase_slips"
        end

        assert_response :success
        assert_operator query_count, :<, 10,
                        "伝票数に比例したクエリが発生していないはず(実行数: #{query_count})"
      end

      test "company_idで絞り込める" do
        sign_in @staff
        other_company = Company.create!(name: "別会社_#{SecureRandom.hex(4)}", supplier: true)
        target = PurchaseSlip.create!(company: @company, received_at: Time.zone.now)
        PurchaseSlip.create!(company: other_company, received_at: Time.zone.now)

        get "/api/v1/purchase_slips", params: { company_id: @company.id }
        body = JSON.parse(response.body)

        assert_equal [ target.id ], body["data"].map { |d| d["id"] }
      end

      test "存在しない伝票を取得すると404が返る" do
        sign_in @staff
        get "/api/v1/purchase_slips/999999"
        assert_response :not_found
      end

      test "不正な画像を添付すると422で拒否される" do
        sign_in @staff
        file = Rack::Test::UploadedFile.new(StringIO.new("dummy"), "text/plain", original_filename: "note.txt")

        post "/api/v1/purchase_slips", params: {
          purchase_slip: { company_id: @company.id, received_at: Time.zone.now.iso8601, slip_image: file }
        }

        assert_response :unprocessable_entity
        body = JSON.parse(response.body)
        assert_equal "slip_image", body["errors"].first["field"]
      end

      test "伝票の更新ができる" do
        sign_in @staff
        slip = PurchaseSlip.create!(company: @company, received_at: Time.zone.now, declared_total_kg: 50.0)

        patch "/api/v1/purchase_slips/#{slip.id}", params: {
          purchase_slip: { declared_total_kg: 55.0 }
        }
        assert_response :success
        assert_equal 55.0, slip.reload.declared_total_kg
      end
    end
  end
end
