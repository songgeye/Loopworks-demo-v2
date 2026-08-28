module PurchaseSlipSerialization
  extend ActiveSupport::Concern

  private

  # N+1 を避けるため、実測合計は個々の伝票に対して都度クエリせず、
  # 対象の伝票 ID 群に対して一括集計する（実装仕様書 v2 §T3-7）。
  def actual_totals_for(slips)
    ProductionRecord.where(purchase_slip_id: slips.map(&:id)).group(:purchase_slip_id).sum(:weight_kg)
  end

  def purchase_slip_summary_json(slip, actual_total_kg)
    {
      id: slip.id,
      slip_no: slip.slip_no,
      company: { id: slip.company.id, name: slip.company.name },
      received_at: slip.received_at,
      declared_total_kg: numeric(slip.declared_total_kg),
      actual_total_kg: numeric(actual_total_kg),
      variance_kg: numeric(PurchaseSlip.variance_kg(slip.declared_total_kg, actual_total_kg)),
      variance_rate: numeric(PurchaseSlip.variance_rate(slip.declared_total_kg, actual_total_kg)),
      variance_alert: PurchaseSlip.variance_alert?(slip.declared_total_kg, actual_total_kg)
    }
  end
end
