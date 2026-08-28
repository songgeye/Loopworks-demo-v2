module Api
  module V1
    class InventoriesController < BaseController
      include PurchaseSlipSerialization

      # マテリアル別の現在庫（実装仕様書 v2 §T4-3）。stock 区分のみを表示する（§4.4）。
      def index
        as_of = parse_as_of
        return if performed?

        breakdown = movements_scope(as_of).group(:material_id, :movement_type).sum(:quantity_kg)

        render json: {
          as_of: (as_of || Time.zone.now).iso8601,
          data: stock_materials.map { |material| inventory_row_json(material, breakdown) }
        }
      end

      # 特定マテリアルの在庫移動履歴（実装仕様書 v2 §T4-3）
      def movements
        material = Material.find(params[:material_id])
        history = InventoryMovement.where(material: material)
                                    .includes(:created_by, :source)
                                    .order(occurred_at: :desc)
                                    .page(params[:page])

        render json: {
          data: history.map { |movement| movement_json(movement) },
          meta: pagination_meta(history)
        }
      end

      private

      def stock_materials
        @stock_materials ||= Material.stock.order(:display_order)
      end

      def movements_scope(as_of)
        scope = InventoryMovement.where(material: stock_materials)
        scope = scope.where(occurred_at: ..as_of) if as_of
        scope
      end

      def parse_as_of
        return nil if params[:as_of].blank?

        parsed = Time.zone.parse(params[:as_of])
        render_invalid_as_of && return if parsed.nil?

        parsed
      rescue ArgumentError, TypeError
        render_invalid_as_of
        nil
      end

      def render_invalid_as_of
        render json: { errors: [ { field: "as_of", message: "日時の形式が不正です" } ] }, status: :unprocessable_entity
        true
      end

      def inventory_row_json(material, breakdown)
        opening = breakdown[[ material.id, "opening" ]] || 0
        purchase_in = breakdown[[ material.id, "purchase_in" ]] || 0
        shipment_out = breakdown[[ material.id, "shipment_out" ]] || 0
        adjustment = breakdown[[ material.id, "adjustment" ]] || 0
        disposal_out = breakdown[[ material.id, "disposal_out" ]] || 0
        stock_kg = opening + purchase_in + shipment_out + adjustment + disposal_out

        {
          material: { id: material.id, name: material.name },
          opening_kg: numeric(opening),
          purchase_in_kg: numeric(purchase_in),
          shipment_out_kg: numeric(shipment_out),
          adjustment_kg: numeric(adjustment),
          disposal_out_kg: numeric(disposal_out),
          stock_kg: numeric(stock_kg),
          negative: stock_kg.negative?
        }
      end

      def movement_json(movement)
        {
          id: movement.id,
          movement_type: movement.movement_type,
          quantity_kg: numeric(movement.quantity_kg),
          occurred_at: movement.occurred_at,
          note: movement.note,
          created_by: { id: movement.created_by.id, name: movement.created_by.name },
          source_type: movement.source_type
        }
      end
    end
  end
end
