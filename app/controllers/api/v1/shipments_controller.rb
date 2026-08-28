module Api
  module V1
    class ShipmentsController < BaseController
      def index
        shipments = Shipment.includes(:company, shipment_items: :material).order(shipped_at: :desc).page(params[:page])

        render json: {
          data: shipments.map { |shipment| shipment_summary_json(shipment) },
          meta: pagination_meta(shipments)
        }
      end

      def show
        shipment = Shipment.includes(:company, shipment_items: :material).find(params[:id])
        render json: shipment_detail_json(shipment)
      end

      def create
        shipment = Shipment.new(shipment_params)
        ok = sync_and_save(shipment) { shipment.save }

        if ok
          render json: shipment_detail_json(shipment).merge(warnings: negative_stock_warnings(shipment)), status: :created
        else
          render json: { errors: error_details(shipment) }, status: :unprocessable_entity
        end
      end

      def update
        shipment = Shipment.find(params[:id])
        ok = sync_and_save(shipment) { shipment.update(shipment_params) }

        if ok
          render json: shipment_detail_json(shipment).merge(warnings: negative_stock_warnings(shipment))
        else
          render json: { errors: error_details(shipment) }, status: :unprocessable_entity
        end
      end

      def destroy
        shipment = Shipment.find(params[:id])
        ActiveRecord::Base.transaction do
          Inventory::RecordShipment.reverse!(shipment, created_by: current_staff)
          shipment.destroy!
        end
        head :no_content
      end

      private

      # 保存 + 在庫移動の同期を同一トランザクションで行う（実装仕様書 v2 §4.3 ★整合性の要件）。
      def sync_and_save(shipment)
        ActiveRecord::Base.transaction do
          next false unless yield

          Inventory::RecordShipment.sync!(shipment, created_by: current_staff)
          true
        end
      end

      def shipment_params
        params.require(:shipment).permit(
          :company_id, :shipped_at, :slip_no, :note,
          shipment_items_attributes: %i[id material_id quantity_kg _destroy]
        )
      end

      # 在庫がマイナスになる場合も登録は許可し、警告を返す（実装仕様書 v2 §4.5）。
      def negative_stock_warnings(shipment)
        shipment.shipment_items.map(&:material).uniq.filter_map do |material|
          stock_kg = InventoryMovement.where(material: material).sum(:quantity_kg)
          next unless stock_kg.negative?

          { message: "#{material.name}の在庫がマイナスになります（#{numeric(stock_kg)}kg）" }
        end
      end

      def shipment_summary_json(shipment)
        {
          id: shipment.id,
          slip_no: shipment.slip_no,
          company: { id: shipment.company.id, name: shipment.company.name },
          shipped_at: shipment.shipped_at,
          total_quantity_kg: numeric(shipment.shipment_items.sum(&:quantity_kg)),
          items: shipment.shipment_items.map { |item| shipment_item_json(item) }
        }
      end

      def shipment_detail_json(shipment)
        {
          id: shipment.id,
          slip_no: shipment.slip_no,
          company: { id: shipment.company.id, name: shipment.company.name },
          shipped_at: shipment.shipped_at,
          note: shipment.note,
          shipment_items: shipment.shipment_items.map { |item| shipment_item_json(item) }
        }
      end

      def shipment_item_json(item)
        {
          id: item.id,
          material: { id: item.material.id, name: item.material.name },
          quantity_kg: numeric(item.quantity_kg)
        }
      end
    end
  end
end
