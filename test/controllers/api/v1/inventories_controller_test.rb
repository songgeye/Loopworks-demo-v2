require "test_helper"

module Api
  module V1
    class InventoriesControllerTest < ActionDispatch::IntegrationTest
      include Devise::Test::IntegrationHelpers

      setup do
        @staff = Staff.create!(username: "signed_in_#{SecureRandom.hex(4)}", name: "ログイン担当",
                                role: "staff", password: "password1234")
        @iron = Material.create!(name: "鉄_#{SecureRandom.hex(4)}", display_order: 1, category: :stock)
        @waste = Material.create!(name: "廃棄_#{SecureRandom.hex(4)}", display_order: 2, category: :disposal)
        @worker = Staff.create!(username: "worker_#{SecureRandom.hex(4)}", name: "作業者", role: "staff", password: "password1234")
      end

      test "未認証の場合は401が返る" do
        get "/api/v1/inventories"
        assert_response :unauthorized
      end

      test "同一マテリアルの複数の生産記録が在庫一覧で合算される" do
        sign_in @staff
        record_a = ProductionRecord.create!(recorded_at: Time.zone.now, material: @iron, staff: @worker, weight_kg: 30, status: "published")
        record_b = ProductionRecord.create!(recorded_at: Time.zone.now, material: @iron, staff: @worker, weight_kg: 20, status: "published")
        Inventory::RecordPurchase.sync!(record_a, created_by: @staff)
        Inventory::RecordPurchase.sync!(record_b, created_by: @staff)

        get "/api/v1/inventories"
        assert_response :success
        body = JSON.parse(response.body)
        row = body["data"].find { |r| r["material"]["id"] == @iron.id }

        assert_equal 50.0, row["stock_kg"]
        assert_equal 50.0, row["purchase_in_kg"]
        assert_equal false, row["negative"]
      end

      test "disposal区分のマテリアルは在庫一覧に表示されない" do
        sign_in @staff
        get "/api/v1/inventories"
        body = JSON.parse(response.body)

        refute_includes body["data"].map { |r| r["material"]["id"] }, @waste.id
      end

      test "在庫がマイナスの場合negativeがtrueになる" do
        sign_in @staff
        InventoryMovement.create!(material: @iron, movement_type: :adjustment, quantity_kg: -10, occurred_at: Time.zone.now, created_by: @staff, note: "テスト")

        get "/api/v1/inventories"
        body = JSON.parse(response.body)
        row = body["data"].find { |r| r["material"]["id"] == @iron.id }

        assert_equal(-10.0, row["stock_kg"])
        assert_equal true, row["negative"]
      end

      test "as_ofで過去時点の在庫を取得できる" do
        sign_in @staff
        InventoryMovement.create!(material: @iron, movement_type: :opening, quantity_kg: 100,
                                   occurred_at: Time.zone.parse("2026-01-01"), created_by: @staff)
        InventoryMovement.create!(material: @iron, movement_type: :purchase_in, quantity_kg: 50,
                                   occurred_at: Time.zone.parse("2026-06-01"), created_by: @staff)

        get "/api/v1/inventories", params: { as_of: "2026-03-01T00:00:00+09:00" }
        body = JSON.parse(response.body)
        row = body["data"].find { |r| r["material"]["id"] == @iron.id }
        assert_equal 100.0, row["stock_kg"]

        get "/api/v1/inventories", params: { as_of: "2026-12-01T00:00:00+09:00" }
        body = JSON.parse(response.body)
        row = body["data"].find { |r| r["material"]["id"] == @iron.id }
        assert_equal 150.0, row["stock_kg"]
      end

      test "在庫移動の履歴が取得できる" do
        sign_in @staff
        record = ProductionRecord.create!(recorded_at: Time.zone.now, material: @iron, staff: @worker, weight_kg: 30, status: "published")
        Inventory::RecordPurchase.sync!(record, created_by: @staff)

        get "/api/v1/inventories/#{@iron.id}/movements"
        assert_response :success
        body = JSON.parse(response.body)
        assert_equal 1, body["data"].size
        assert_equal "purchase_in", body["data"].first["movement_type"]
      end
    end
  end
end
