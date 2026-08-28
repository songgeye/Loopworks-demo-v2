class Shipment < ApplicationRecord
  acts_as_paranoid

  belongs_to :company
  has_many :shipment_items, dependent: :destroy
  accepts_nested_attributes_for :shipment_items, allow_destroy: true

  validates :shipped_at, presence: true
  validate :company_must_be_buyer
  validate :must_have_at_least_one_item

  private

  def company_must_be_buyer
    return if company.nil? || company.buyer?

    errors.add(:company_id, "は売却先(buyer)として登録された取引先のみ選択できます")
  end

  def must_have_at_least_one_item
    return if shipment_items.reject(&:marked_for_destruction?).any?

    errors.add(:shipment_items, "を1件以上指定してください")
  end
end
