require "test_helper"
require "minitest/mock"

class ProductionRecordInventorySyncTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @admin = Staff.create!(username: "admin_#{SecureRandom.hex(4)}", name: "管理者", role: "admin", password: "password1234")
    @iron = Material.create!(name: "鉄_#{SecureRandom.hex(4)}", display_order: 1, category: :stock)
  end

  test "ERB経由で生産記録を作成するとpurchase_inが生成される" do
    sign_in @admin

    post "/production_records", params: {
      production_record: { recorded_at: Time.zone.now.iso8601, material_id: @iron.id, staff_id: @admin.id, weight_kg: 12 }
    }
    assert_redirected_to production_records_path

    record = ProductionRecord.order(:id).last
    assert_equal 12.0, InventoryMovement.where(material: @iron).sum(:quantity_kg).to_f
    assert_equal "purchase_in", InventoryMovement.find_by(source: record).movement_type
  end

  test "ERB経由の更新で打ち消し+再登録が行われる" do
    sign_in @admin
    post "/production_records", params: {
      production_record: { recorded_at: Time.zone.now.iso8601, material_id: @iron.id, staff_id: @admin.id, weight_kg: 12 }
    }
    record = ProductionRecord.order(:id).last

    patch "/production_records/#{record.id}", params: { production_record: { weight_kg: 20 } }
    assert_redirected_to production_records_path

    assert_equal 20.0, InventoryMovement.where(material: @iron).sum(:quantity_kg).to_f
    assert_equal 3, InventoryMovement.where(source: record).count
  end

  test "ERB経由の削除で在庫が打ち消される(物理削除されない)" do
    sign_in @admin
    post "/production_records", params: {
      production_record: { recorded_at: Time.zone.now.iso8601, material_id: @iron.id, staff_id: @admin.id, weight_kg: 12 }
    }
    record = ProductionRecord.order(:id).last

    delete "/production_records/#{record.id}"
    assert_redirected_to production_records_path

    assert_equal 0.0, InventoryMovement.where(material: @iron).sum(:quantity_kg).to_f
    assert ProductionRecord.only_deleted.exists?(record.id)
  end

  test "在庫移動の生成が失敗すると生産記録も保存されない(トランザクション)" do
    sign_in @admin

    Inventory::RecordPurchase.stub(:sync!, ->(*_args, **_kwargs) { raise ActiveRecord::RecordInvalid.new(InventoryMovement.new) }) do
      post "/production_records", params: {
        production_record: { recorded_at: Time.zone.now.iso8601, material_id: @iron.id, staff_id: @admin.id, weight_kg: 12 }
      }
    end

    assert_response :unprocessable_entity

    assert_equal 0, ProductionRecord.count
    assert_equal 0, InventoryMovement.count
  end
end
