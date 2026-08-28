module Api
  module V1
    class CompaniesController < BaseController
      include PurchaseSlipSerialization

      def index
        companies = Company.all
        companies = companies.where(supplier: true) if params[:role] == "supplier"
        companies = companies.where(buyer: true) if params[:role] == "buyer"
        companies = companies.order(:name).page(params[:page])
        received_totals = received_totals_for(companies)

        render json: {
          data: companies.map { |company| company_json(company, received_totals[company.id] || 0) },
          meta: pagination_meta(companies)
        }
      end

      # その取引先の買取伝票を、差分の概要つきで一覧する（実装仕様書 v2 §T3-3）
      def variances
        company = Company.find(params[:id])
        slips = company.purchase_slips
                        .includes(:company)
                        .order(received_at: :desc)
                        .page(params[:page])
        actual_totals = actual_totals_for(slips)

        render json: {
          data: slips.map { |slip| purchase_slip_summary_json(slip, actual_totals[slip.id] || 0) },
          meta: pagination_meta(slips)
        }
      end

      private

      # 全期間の累計受入重量(kg)。買取伝票経由で紐づく生産記録の実測合計で、
      # disposal区分も含める(§4.4と同じ考え方: 物理的な搬入量なので在庫計上とは区別する)。
      # 会社ごとに都度クエリせず、対象の会社ID群に対して一括集計する(N+1回避)。
      def received_totals_for(companies)
        ProductionRecord.joins(:purchase_slip)
                         .where(purchase_slips: { company_id: companies.map(&:id) })
                         .group("purchase_slips.company_id")
                         .sum(:weight_kg)
      end

      def company_json(company, total_received_kg = nil)
        {
          id: company.id,
          name: company.name,
          supplier: company.supplier,
          buyer: company.buyer,
          total_received_kg: total_received_kg && numeric(total_received_kg)
        }
      end
    end
  end
end
