class InventoryMovement < ApplicationRecord
  belongs_to :material
  belongs_to :source, polymorphic: true, optional: true
  belongs_to :created_by, class_name: "Staff"

  enum :movement_type, {
    opening: 0,
    purchase_in: 1,
    shipment_out: 2,
    adjustment: 3,
    disposal_out: 4
  }

  validates :quantity_kg, presence: true
  validates :occurred_at, presence: true
end
