class Purchaser < ApplicationRecord
  acts_as_paranoid

  belongs_to :company

  validates :name, presence: true
end
