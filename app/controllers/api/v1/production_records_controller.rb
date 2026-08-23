module Api
  module V1
    class ProductionRecordsController < BaseController
      before_action :validate_date_params

      def index
        @records = filtered_records.order(recorded_at: :desc)

        respond_to do |format|
          format.xlsx do
            response.headers["Content-Disposition"] =
              ActionDispatch::Http::ContentDisposition.format(
                disposition: "attachment", filename: export_filename
              )
          end
        end
      end

      private

      def validate_date_params
        errors = []
        @from_time = parse_date_boundary("from", params[:from], errors)&.beginning_of_day
        @to_time = parse_date_boundary("to", params[:to], errors)&.end_of_day
        render json: { errors: errors }, status: :unprocessable_entity if errors.any?
      end

      def parse_date_boundary(field, value, errors)
        return nil if value.blank?

        parsed = Time.zone.parse(value)
        errors << { field: field, message: "日付の形式が不正です(YYYY-MM-DDで指定してください)" } if parsed.nil?
        parsed
      rescue ArgumentError, TypeError
        errors << { field: field, message: "日付の形式が不正です(YYYY-MM-DDで指定してください)" }
        nil
      end

      def filtered_records
        records = ProductionRecord.includes(:material, :staff)
        records = records.where(material_id: params[:material_id]) if params[:material_id].present?
        records = records.where(staff_id: params[:staff_id]) if params[:staff_id].present?
        records = records.where(recorded_at: @from_time..) if @from_time
        records = records.where(recorded_at: ..@to_time) if @to_time
        records
      end

      def export_filename
        if @from_time || @to_time
          from_label = @from_time&.strftime("%Y%m%d") || "始端"
          to_label = @to_time&.strftime("%Y%m%d") || "現在"
          "生産記録_#{from_label}-#{to_label}.xlsx"
        else
          "生産記録_#{Time.zone.today.strftime('%Y%m%d')}.xlsx"
        end
      end
    end
  end
end
