require "test_helper"

module Inventory
  class RecordShipmentTest < ActiveSupport::TestCase
    setup do
      @staff = Staff.create!(username: "svc_#{SecureRandom.hex(4)}", name: "検証", role: "staff", password: "password1234")
      @buyer = Company.create!(name: "買主_#{SecureRandom.hex(4)}", buyer: true)
      @iron = Material.create!(name: "鉄_#{SecureRandom.hex(4)}", display_order: 1, category: :stock)
      @copper = Material.create!(name: "銅_#{SecureRandom.hex(4)}", display_order: 2, category: :stock)

      InventoryMovement.create!(material: @iron, movement_type: :opening, quantity_kg: 100, occurred_at: Time.zone.now, created_by: @staff)
    end

    test "出荷を登録するとshipment_outが生成され、在庫が減る" do
      shipment = Shipment.create!(company: @buyer, shipped_at: Time.zone.now,
                                   shipment_items_attributes: [ { material: @iron, quantity_kg: 40 } ])
      RecordShipment.sync!(shipment, created_by: @staff)

      assert_equal 60.0, InventoryMovement.where(material: @iron).sum(:quantity_kg).to_f
      movement = InventoryMovement.find_by(source: shipment, material: @iron)
      assert_equal(-40.0, movement.quantity_kg.to_f)
    end

    test "1回の出荷で複数マテリアルを出せる" do
      shipment = Shipment.create!(company: @buyer, shipped_at: Time.zone.now, shipment_items_attributes: [
        { material: @iron, quantity_kg: 20 },
        { material: @copper, quantity_kg: 5 }
      ])
      RecordShipment.sync!(shipment, created_by: @staff)

      assert_equal 2, InventoryMovement.where(source: shipment).count
    end

    test "更新すると打ち消し+再登録が行われる" do
      shipment = Shipment.create!(company: @buyer, shipped_at: Time.zone.now,
                                   shipment_items_attributes: [ { material: @iron, quantity_kg: 20 } ])
      RecordShipment.sync!(shipment, created_by: @staff)

      shipment.shipment_items.first.update!(quantity_kg: 35)
      RecordShipment.sync!(shipment, created_by: @staff)

      assert_equal 65.0, InventoryMovement.where(material: @iron).sum(:quantity_kg).to_f
    end

    test "削除すると逆符号のadjustmentで打ち消される" do
      shipment = Shipment.create!(company: @buyer, shipped_at: Time.zone.now,
                                   shipment_items_attributes: [ { material: @iron, quantity_kg: 20 } ])
      RecordShipment.sync!(shipment, created_by: @staff)

      RecordShipment.reverse!(shipment, created_by: @staff)

      assert_equal 100.0, InventoryMovement.where(material: @iron).sum(:quantity_kg).to_f
    end
  end
end
