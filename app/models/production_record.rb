class ProductionRecord < ApplicationRecord
  belongs_to :material
  belongs_to :staff
  acts_as_paranoid

  validates :recorded_at, presence: true
  validates :weight_kg, presence: true, numericality: { greater_than: 0 }
  validates :status, presence: true, inclusion: { in: %w[draft published] }
end
