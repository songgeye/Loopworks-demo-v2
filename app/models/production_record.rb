class ProductionRecord < ApplicationRecord
  belongs_to :material
  belongs_to :staff
  acts_as_paranoid
  before_validation :set_default_status

  validates :recorded_at, presence: true
  validates :weight_kg, presence: true, numericality: { greater_than: 0 }
  validates :status, presence: true, inclusion: { in: %w[draft published] }

  private

  def set_default_status
    self.status ||= 'published'
  end
end
