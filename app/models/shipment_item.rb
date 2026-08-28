class ShipmentItem < ApplicationRecord
  belongs_to :shipment
  belongs_to :material

  validates :quantity_kg, presence: true, numericality: { greater_than: 0 }
  validate :material_must_be_stock

  private

  def material_must_be_stock
    return if material.nil? || material.stock?

    errors.add(:material_id, "は在庫区分(stock)のマテリアルのみ出荷できます")
  end
end
