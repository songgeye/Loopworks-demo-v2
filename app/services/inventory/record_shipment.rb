module Inventory
  # 出荷の作成・更新・削除と在庫移動(shipment_out)を同一トランザクションで同期する。
  # shipment_items 1件につき shipment_out を1件生成する（実装仕様書 v2 §4.5, §T4-2）。
  class RecordShipment
    def self.sync!(shipment, created_by:)
      new(shipment, created_by: created_by).sync!
    end

    def self.reverse!(shipment, created_by:)
      new(shipment, created_by: created_by).reverse!
    end

    def initialize(shipment, created_by:)
      @shipment = shipment
      @created_by = created_by
    end

    def sync!
      ActiveRecord::Base.transaction do
        reverse!
        @shipment.shipment_items.each { |item| post!(item) }
      end
    end

    def reverse!
      Reverse.call(@shipment, created_by: @created_by, note: "出荷の変更・削除による打ち消し")
    end

    private

    def post!(item)
      InventoryMovement.create!(
        material: item.material,
        movement_type: :shipment_out,
        quantity_kg: -item.quantity_kg,
        occurred_at: @shipment.shipped_at,
        source: @shipment,
        created_by: @created_by
      )
    end
  end
end
