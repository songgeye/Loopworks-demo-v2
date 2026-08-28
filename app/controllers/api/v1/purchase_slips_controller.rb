module Api
  module V1
    class PurchaseSlipsController < BaseController
      include PurchaseSlipSerialization

      def index
        slips = filtered_slips.includes(:company).order(received_at: :desc).page(params[:page])
        actual_totals = actual_totals_for(slips)

        render json: {
          data: slips.map { |slip| purchase_slip_summary_json(slip, actual_totals[slip.id] || 0) },
          meta: pagination_meta(slips)
        }
      end

      def show
        slip = PurchaseSlip.includes(:company, :contact, production_records: %i[material staff]).find(params[:id])
        render json: purchase_slip_detail_json(slip)
      end

      def create
        slip = PurchaseSlip.new(purchase_slip_params)
        if slip.save
          render json: purchase_slip_detail_json(slip), status: :created
        else
          render json: { errors: error_details(slip) }, status: :unprocessable_entity
        end
      end

      def update
        slip = PurchaseSlip.find(params[:id])
        if slip.update(purchase_slip_params)
          render json: purchase_slip_detail_json(slip)
        else
          render json: { errors: error_details(slip) }, status: :unprocessable_entity
        end
      end

      private

      def filtered_slips
        slips = PurchaseSlip.all
        slips = slips.where(company_id: params[:company_id]) if params[:company_id].present?
        slips
      end

      def purchase_slip_params
        params.require(:purchase_slip).permit(
          :company_id, :contact_id, :received_at, :slip_no, :declared_total_kg, :note, :slip_image
        )
      end

      def purchase_slip_detail_json(slip)
        {
          id: slip.id,
          slip_no: slip.slip_no,
          company: { id: slip.company.id, name: slip.company.name },
          contact: slip.contact && { id: slip.contact.id, name: slip.contact.name },
          received_at: slip.received_at,
          declared_total_kg: numeric(slip.declared_total_kg),
          actual_total_kg: numeric(slip.actual_total_kg),
          variance_kg: numeric(slip.variance_kg),
          variance_rate: numeric(slip.variance_rate),
          variance_alert: slip.variance_alert?,
          material_subtotals: slip.material_subtotals.map do |subtotal|
            {
              material: { id: subtotal[:material].id, name: subtotal[:material].name },
              quantity_kg: numeric(subtotal[:quantity_kg]),
              count: subtotal[:count]
            }
          end,
          production_records: slip.production_records.map { |record| production_record_json(record) },
          # 締め後の編集制限(T2)は未実装のため、現時点では常に true を返す。
          editable: true
        }
      end

      def production_record_json(record)
        {
          id: record.id,
          recorded_at: record.recorded_at,
          material: { id: record.material.id, name: record.material.name },
          staff: { id: record.staff.id, name: record.staff.name },
          weight_kg: numeric(record.weight_kg),
          status: record.status,
          note: record.note
        }
      end
    end
  end
end
