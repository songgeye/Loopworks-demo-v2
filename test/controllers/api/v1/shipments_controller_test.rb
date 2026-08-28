require "test_helper"

module Api
  module V1
    class ShipmentsControllerTest < ActionDispatch::IntegrationTest
      include Devise::Test::IntegrationHelpers

      setup do
        @staff = Staff.create!(username: "signed_in_#{SecureRandom.hex(4)}", name: "ログイン担当",
                                role: "staff", password: "password1234")
        @buyer = Company.create!(name: "買主_#{SecureRandom.hex(4)}", buyer: true)
        @supplier_only = Company.create!(name: "仕入先のみ_#{SecureRandom.hex(4)}", supplier: true)
        @iron = Material.create!(name: "鉄_#{SecureRandom.hex(4)}", display_order: 1, category: :stock)
        @waste = Material.create!(name: "廃棄_#{SecureRandom.hex(4)}", display_order: 2, category: :disposal)
        @worker = Staff.create!(username: "worker_#{SecureRandom.hex(4)}", name: "作業者", role: "staff", password: "password1234")

        InventoryMovement.create!(material: @iron, movement_type: :opening, quantity_kg: 100, occurred_at: Time.zone.now, created_by: @staff)
      end

      test "未認証の場合は401が返る" do
        get "/api/v1/shipments"
        assert_response :unauthorized
      end

      test "出荷一覧に品目別の内訳が表示される" do
        sign_in @staff
        copper = Material.create!(name: "銅_#{SecureRandom.hex(4)}", display_order: 3, category: :stock)
        shipment = Shipment.create!(company: @buyer, shipped_at: Time.zone.now, shipment_items_attributes: [
          { material: @iron, quantity_kg: 20 },
          { material: copper, quantity_kg: 5 }
        ])
        Inventory::RecordShipment.sync!(shipment, created_by: @staff)

        get "/api/v1/shipments"
        assert_response :success
        row = JSON.parse(response.body)["data"].find { |s| s["id"] == shipment.id }

        assert_equal 25.0, row["total_quantity_kg"]
        assert_equal 2, row["items"].size
        item_names = row["items"].map { |i| i["material"]["name"] }
        assert_includes item_names, @iron.name
        assert_includes item_names, copper.name
      end

      test "出荷一覧でN+1が発生しない" do
        sign_in @staff
        companies = Array.new(3) { |i| Company.create!(name: "買主#{i}_#{SecureRandom.hex(4)}", buyer: true) }
        30.times do |i|
          shipment = Shipment.create!(company: companies[i % companies.size], shipped_at: Time.zone.now,
                                       shipment_items_attributes: [ { material: @iron, quantity_kg: 1 } ])
          Inventory::RecordShipment.sync!(shipment, created_by: @staff)
        end

        query_count = 0
        callback = ->(*, payload) { query_count += 1 unless payload[:name] == "SCHEMA" }
        ActiveSupport::Notifications.subscribed(callback, "sql.active_record") do
          get "/api/v1/shipments"
        end

        assert_response :success
        assert_operator query_count, :<, 10, "出荷数に比例したクエリが発生していないはず(実行数: #{query_count})"
      end

      test "出荷を登録するとshipment_outが生成され在庫が減る" do
        sign_in @staff

        post "/api/v1/shipments", params: {
          shipment: {
            company_id: @buyer.id,
            shipped_at: Time.zone.now.iso8601,
            shipment_items_attributes: [ { material_id: @iron.id, quantity_kg: 30 } ]
          }
        }
        assert_response :created
        body = JSON.parse(response.body)
        assert_equal 1, body["shipment_items"].size
        assert_equal 70.0, InventoryMovement.where(material: @iron).sum(:quantity_kg).to_f
      end

      test "在庫がマイナスになる出荷でも登録は許可され、警告が返る" do
        sign_in @staff

        post "/api/v1/shipments", params: {
          shipment: {
            company_id: @buyer.id,
            shipped_at: Time.zone.now.iso8601,
            shipment_items_attributes: [ { material_id: @iron.id, quantity_kg: 150 } ]
          }
        }
        assert_response :created
        body = JSON.parse(response.body)
        assert_equal(-50.0, InventoryMovement.where(material: @iron).sum(:quantity_kg).to_f)
        assert body["warnings"].any? { |w| w["message"].include?(@iron.name) }
      end

      test "出荷先はbuyer:trueの会社のみ選択できる" do
        sign_in @staff

        post "/api/v1/shipments", params: {
          shipment: {
            company_id: @supplier_only.id,
            shipped_at: Time.zone.now.iso8601,
            shipment_items_attributes: [ { material_id: @iron.id, quantity_kg: 10 } ]
          }
        }
        assert_response :unprocessable_entity
        body = JSON.parse(response.body)
        assert_equal "company_id", body["errors"].first["field"]
      end

      test "disposal区分のマテリアルは出荷できない" do
        sign_in @staff

        post "/api/v1/shipments", params: {
          shipment: {
            company_id: @buyer.id,
            shipped_at: Time.zone.now.iso8601,
            shipment_items_attributes: [ { material_id: @waste.id, quantity_kg: 10 } ]
          }
        }
        assert_response :unprocessable_entity
      end

      test "出荷の更新で打ち消し+再登録が行われる" do
        sign_in @staff
        post "/api/v1/shipments", params: {
          shipment: {
            company_id: @buyer.id, shipped_at: Time.zone.now.iso8601,
            shipment_items_attributes: [ { material_id: @iron.id, quantity_kg: 20 } ]
          }
        }
        shipment_id = JSON.parse(response.body)["id"]
        item_id = JSON.parse(response.body)["shipment_items"].first["id"]

        patch "/api/v1/shipments/#{shipment_id}", params: {
          shipment: { shipment_items_attributes: [ { id: item_id, quantity_kg: 35 } ] }
        }
        assert_response :success
        assert_equal 65.0, InventoryMovement.where(material: @iron).sum(:quantity_kg).to_f
      end

      test "出荷を削除すると在庫が逆符号のadjustmentで打ち消される" do
        sign_in @staff
        post "/api/v1/shipments", params: {
          shipment: {
            company_id: @buyer.id, shipped_at: Time.zone.now.iso8601,
            shipment_items_attributes: [ { material_id: @iron.id, quantity_kg: 20 } ]
          }
        }
        shipment_id = JSON.parse(response.body)["id"]

        delete "/api/v1/shipments/#{shipment_id}"
        assert_response :no_content
        assert_equal 100.0, InventoryMovement.where(material: @iron).sum(:quantity_kg).to_f
        assert Shipment.only_deleted.exists?(shipment_id)
      end
    end
  end
end
