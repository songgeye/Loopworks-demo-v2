class PurchaseSlip < ApplicationRecord
  acts_as_paranoid

  SLIP_IMAGE_CONTENT_TYPES = %w[image/jpeg image/png image/heic application/pdf].freeze
  SLIP_IMAGE_MAX_BYTES = 10.megabytes

  belongs_to :company
  belongs_to :contact, class_name: "Purchaser", optional: true
  has_many :production_records
  has_one_attached :slip_image

  validates :received_at, presence: true
  validate :slip_image_must_be_acceptable

  # 廃棄区分を含む全ての生産記録を合算する（実装仕様書 v2 §4.4, §T3-2）
  def actual_total_kg
    production_records.sum(:weight_kg)
  end

  def variance_kg
    self.class.variance_kg(declared_total_kg, actual_total_kg)
  end

  def variance_rate
    self.class.variance_rate(declared_total_kg, actual_total_kg)
  end

  def variance_alert?
    self.class.variance_alert?(declared_total_kg, actual_total_kg)
  end

  class << self
    # 一覧表示など、実測合計をまとめて集計計算済みの場合に使う（N+1 回避用）。
    def variance_kg(declared_total_kg, actual_total_kg)
      return nil if declared_total_kg.nil?

      actual_total_kg - declared_total_kg
    end

    def variance_rate(declared_total_kg, actual_total_kg)
      return nil if declared_total_kg.nil? || declared_total_kg.zero?

      (variance_kg(declared_total_kg, actual_total_kg) / declared_total_kg * 100).round(2)
    end

    def variance_alert?(declared_total_kg, actual_total_kg)
      rate = variance_rate(declared_total_kg, actual_total_kg)
      return false if rate.nil?

      rate.abs > VARIANCE_ALERT_THRESHOLD_PERCENT
    end
  end

  # 同一マテリアルの複数梱包を合算した内訳（実装仕様書 v2 §T3-3, 確認事項E）
  def material_subtotals
    totals = production_records.group(:material_id).sum(:weight_kg)
    counts = production_records.group(:material_id).count
    materials_by_id = Material.where(id: totals.keys).index_by(&:id)

    totals.map do |material_id, total_kg|
      {
        material: materials_by_id[material_id],
        quantity_kg: total_kg,
        count: counts[material_id]
      }
    end
  end

  private

  def slip_image_must_be_acceptable
    return unless slip_image.attached?

    unless SLIP_IMAGE_CONTENT_TYPES.include?(slip_image.content_type)
      errors.add(:slip_image, "はJPEG・PNG・HEIC・PDFのいずれかにしてください")
    end

    if slip_image.byte_size > SLIP_IMAGE_MAX_BYTES
      errors.add(:slip_image, "は10MB以下にしてください")
    end
  end
end
