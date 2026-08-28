module Inventory
  # source に紐づく在庫移動の純増減をマテリアルごとに集計し、逆符号の adjustment で打ち消す。
  # 物理削除は行わない（実装仕様書 v2 §4.3 ★整合性の要件）。
  class Reverse
    def self.call(source, created_by:, note: nil)
      new(source, created_by: created_by, note: note).call
    end

    def initialize(source, created_by:, note: nil)
      @source = source
      @created_by = created_by
      @note = note
    end

    def call
      net_by_material.each do |material_id, net_quantity_kg|
        next if net_quantity_kg.zero?

        InventoryMovement.create!(
          material_id: material_id,
          movement_type: :adjustment,
          quantity_kg: -net_quantity_kg,
          occurred_at: Time.zone.now,
          source: @source,
          created_by: @created_by,
          note: @note || "打ち消し"
        )
      end
    end

    private

    def net_by_material
      InventoryMovement.where(source: @source).group(:material_id).sum(:quantity_kg)
    end
  end
end
