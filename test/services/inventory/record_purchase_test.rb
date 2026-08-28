require "test_helper"

module Inventory
  class RecordPurchaseTest < ActiveSupport::TestCase
    setup do
      @staff = Staff.create!(username: "svc_#{SecureRandom.hex(4)}", name: "検証", role: "staff", password: "password1234")
      @iron = Material.create!(name: "鉄_#{SecureRandom.hex(4)}", display_order: 1, category: :stock)
      @waste = Material.create!(name: "廃棄_#{SecureRandom.hex(4)}", display_order: 2, category: :disposal)
    end

    test "stock区分の生産記録を登録するとpurchase_inが生成される" do
      record = ProductionRecord.create!(recorded_at: Time.zone.now, material: @iron, staff: @staff, weight_kg: 30, status: "published")
      RecordPurchase.sync!(record, created_by: @staff)

      movement = InventoryMovement.find_by(source: record)
      assert_equal "purchase_in", movement.movement_type
      assert_equal 30.0, movement.quantity_kg.to_f
      assert_equal 30.0, InventoryMovement.where(material: @iron).sum(:quantity_kg).to_f
    end

    test "disposal区分の生産記録では在庫移動が生成されない" do
      record = ProductionRecord.create!(recorded_at: Time.zone.now, material: @waste, staff: @staff, weight_kg: 10, status: "published")
      RecordPurchase.sync!(record, created_by: @staff)

      assert_equal 0, InventoryMovement.where(source: record).count
    end

    test "更新すると打ち消し+再登録が行われ、既存行を書き換えない(履歴が残る)" do
      record = ProductionRecord.create!(recorded_at: Time.zone.now, material: @iron, staff: @staff, weight_kg: 30, status: "published")
      RecordPurchase.sync!(record, created_by: @staff)

      record.update!(weight_kg: 45)
      RecordPurchase.sync!(record, created_by: @staff)

      movements = InventoryMovement.where(source: record).order(:id)
      assert_equal 3, movements.count
      assert_equal [ "purchase_in", "adjustment", "purchase_in" ], movements.map(&:movement_type)
      assert_equal [ 30.0, -30.0, 45.0 ], movements.map { |m| m.quantity_kg.to_f }
      assert_equal 45.0, InventoryMovement.where(material: @iron).sum(:quantity_kg).to_f
    end

    test "削除すると逆符号のadjustmentで打ち消される(物理削除されない)" do
      record = ProductionRecord.create!(recorded_at: Time.zone.now, material: @iron, staff: @staff, weight_kg: 30, status: "published")
      RecordPurchase.sync!(record, created_by: @staff)

      RecordPurchase.reverse!(record, created_by: @staff)

      assert_equal 0.0, InventoryMovement.where(material: @iron).sum(:quantity_kg).to_f
      assert_equal 2, InventoryMovement.where(source: record).count
      assert InventoryMovement.where(source: record).all? { |m| m.persisted? }
    end

    test "マテリアルを跨いだ更新でも旧マテリアルの在庫が正しく打ち消される" do
      other = Material.create!(name: "銅_#{SecureRandom.hex(4)}", display_order: 3, category: :stock)
      record = ProductionRecord.create!(recorded_at: Time.zone.now, material: @iron, staff: @staff, weight_kg: 30, status: "published")
      RecordPurchase.sync!(record, created_by: @staff)

      record.update!(material: other, weight_kg: 30)
      RecordPurchase.sync!(record, created_by: @staff)

      assert_equal 0.0, InventoryMovement.where(material: @iron).sum(:quantity_kg).to_f
      assert_equal 30.0, InventoryMovement.where(material: other).sum(:quantity_kg).to_f
    end
  end
end
