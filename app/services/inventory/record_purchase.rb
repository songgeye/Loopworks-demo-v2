module Inventory
  # 生産記録の作成・更新・削除と在庫移動(purchase_in)を同一トランザクションで同期する。
  # 更新時は既存分を打ち消してから現在の状態で再登録する（書き換えない）。
  # disposal 区分のマテリアルは在庫に計上しない（実装仕様書 v2 §4.4）。
  class RecordPurchase
    def self.sync!(production_record, created_by:)
      new(production_record, created_by: created_by).sync!
    end

    def self.reverse!(production_record, created_by:)
      new(production_record, created_by: created_by).reverse!
    end

    def initialize(production_record, created_by:)
      @record = production_record
      @created_by = created_by
    end

    def sync!
      ActiveRecord::Base.transaction do
        reverse!
        post! if @record.material.stock?
      end
    end

    def reverse!
      Reverse.call(@record, created_by: @created_by, note: "生産記録の変更・削除による打ち消し")
    end

    private

    def post!
      InventoryMovement.create!(
        material: @record.material,
        movement_type: :purchase_in,
        quantity_kg: @record.weight_kg,
        occurred_at: @record.recorded_at,
        source: @record,
        created_by: @created_by
      )
    end
  end
end
