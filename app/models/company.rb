class Company < ApplicationRecord
  acts_as_paranoid

  has_many :purchasers, dependent: :destroy
  has_many :purchase_slips
  has_many :shipments

  validates :name, presence: true
end
