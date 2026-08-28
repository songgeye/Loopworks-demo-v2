require "test_helper"

class PurchaseSlipTest < ActiveSupport::TestCase
  setup do
    @company = Company.create!(name: "テスト商事_#{SecureRandom.hex(4)}", supplier: true)
    @material = Material.create!(name: "鉄_#{SecureRandom.hex(4)}", display_order: 1)
    @staff = Staff.create!(username: "s_#{SecureRandom.hex(4)}", name: "検証", role: "staff", password: "password1234")
  end

  test "declared_total_kgがnilなら差分系はすべてnilを返す(0を返さない)" do
    slip = PurchaseSlip.create!(company: @company, received_at: Time.zone.now, declared_total_kg: nil)
    ProductionRecord.create!(recorded_at: Time.zone.now, material: @material, staff: @staff, weight_kg: 10, purchase_slip: slip, status: "published")

    assert_nil slip.variance_kg
    assert_nil slip.variance_rate
    assert_equal false, slip.variance_alert?
  end

  test "declared_total_kgが0のときvariance_rateはnilを返す(ゼロ除算を避ける)" do
    slip = PurchaseSlip.create!(company: @company, received_at: Time.zone.now, declared_total_kg: 0)

    assert_nil slip.variance_rate
    assert_equal false, slip.variance_alert?
  end

  test "生産記録がまだ紐づいていない場合actual_total_kgは0" do
    slip = PurchaseSlip.create!(company: @company, received_at: Time.zone.now, declared_total_kg: 50.0)

    assert_equal 0, slip.actual_total_kg
    assert_equal(-50.0, slip.variance_kg)
  end

  test "JPEG/PNG/HEIC/PDF以外の伝票写真は拒否される" do
    slip = PurchaseSlip.new(company: @company, received_at: Time.zone.now)
    slip.slip_image.attach(io: StringIO.new("dummy"), filename: "a.txt", content_type: "text/plain")

    assert_not slip.valid?
    assert_includes slip.errors[:slip_image].join, "JPEG"
  end

  test "10MBを超える伝票写真は拒否される" do
    slip = PurchaseSlip.new(company: @company, received_at: Time.zone.now)
    slip.slip_image.attach(
      io: StringIO.new("x" * 10),
      filename: "a.jpg",
      content_type: "image/jpeg"
    )
    slip.slip_image.blob.update!(byte_size: 11.megabytes)

    assert_not slip.valid?
    assert_includes slip.errors[:slip_image].join, "10MB"
  end
end
