class Staff < ApplicationRecord
  has_many :production_records
  has_secure_password

  validates :login_id, presence: true, uniqueness: true
  validates :name, presence: true
  validates :role, presence: true, inclusion: { in: %w[admin staff] }
end
