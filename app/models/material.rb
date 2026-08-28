class Material < ApplicationRecord
  has_many :production_records
  has_many :inventory_movements
  has_many :shipment_items
  acts_as_paranoid

  enum :category, { stock: 0, disposal: 1 }

  validates :name, presence: true, uniqueness: true
  validates :display_order, presence: true, numericality: { only_integer: true, greater_than: 0 }
end
