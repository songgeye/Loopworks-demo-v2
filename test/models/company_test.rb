require "test_helper"

class CompanyTest < ActiveSupport::TestCase
  test "supplierとbuyerは排他ではなく両方trueにできる" do
    company = Company.create!(name: "両方社_#{SecureRandom.hex(4)}", supplier: true, buyer: true)

    assert company.supplier?
    assert company.buyer?
  end

  test "nameは必須" do
    company = Company.new
    assert_not company.valid?
    assert_includes company.errors[:name], "can't be blank"
  end
end
