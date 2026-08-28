require "test_helper"

module Api
  module V1
    class CompaniesControllerTest < ActionDispatch::IntegrationTest
      include Devise::Test::IntegrationHelpers

      setup do
        @staff = Staff.create!(username: "signed_in_#{SecureRandom.hex(4)}", name: "ログイン担当",
                                role: "staff", password: "password1234")
        @supplier = Company.create!(name: "仕入先_#{SecureRandom.hex(4)}", supplier: true, buyer: false)
        @buyer = Company.create!(name: "売却先_#{SecureRandom.hex(4)}", supplier: false, buyer: true)
        @both = Company.create!(name: "両方_#{SecureRandom.hex(4)}", supplier: true, buyer: true)
      end

      test "未認証の場合は401が返る" do
        get "/api/v1/companies"
        assert_response :unauthorized
      end

      test "role=supplierで絞り込むと持込元のみ返る" do
        sign_in @staff
        get "/api/v1/companies", params: { role: "supplier" }
        body = JSON.parse(response.body)
        ids = body["data"].map { |c| c["id"] }

        assert_includes ids, @supplier.id
        assert_includes ids, @both.id
        refute_includes ids, @buyer.id
      end

      test "role=buyerで絞り込むと売却先のみ返る" do
        sign_in @staff
        get "/api/v1/companies", params: { role: "buyer" }
        body = JSON.parse(response.body)
        ids = body["data"].map { |c| c["id"] }

        assert_includes ids, @buyer.id
        assert_includes ids, @both.id
        refute_includes ids, @supplier.id
      end

      test "1社が仕入先と売却先の両方の役割を持てる" do
        assert @both.supplier?
        assert @both.buyer?
      end

      test "全期間の累計受入重量が会社ごとに正しく集計される(disposal区分も含む)" do
        sign_in @staff
        iron = Material.create!(name: "鉄_#{SecureRandom.hex(4)}", display_order: 1, category: :stock)
        waste = Material.create!(name: "廃棄_#{SecureRandom.hex(4)}", display_order: 2, category: :disposal)
        worker = Staff.create!(username: "w_#{SecureRandom.hex(4)}", name: "作業者", role: "staff", password: "password1234")

        slip1 = PurchaseSlip.create!(company: @supplier, received_at: Time.zone.parse("2026-01-01"))
        slip2 = PurchaseSlip.create!(company: @supplier, received_at: Time.zone.parse("2026-06-01"))
        ProductionRecord.create!(recorded_at: Time.zone.now, material: iron, staff: worker, weight_kg: 60, purchase_slip: slip1, status: "published")
        ProductionRecord.create!(recorded_at: Time.zone.now, material: waste, staff: worker, weight_kg: 10, purchase_slip: slip1, status: "published")
        ProductionRecord.create!(recorded_at: Time.zone.now, material: iron, staff: worker, weight_kg: 30, purchase_slip: slip2, status: "published")

        get "/api/v1/companies", params: { role: "supplier" }
        body = JSON.parse(response.body)
        row = body["data"].find { |c| c["id"] == @supplier.id }

        assert_equal 100.0, row["total_received_kg"]
      end

      test "受入実績のない会社はtotal_received_kgが0になる" do
        sign_in @staff
        get "/api/v1/companies", params: { role: "buyer" }
        body = JSON.parse(response.body)
        row = body["data"].find { |c| c["id"] == @buyer.id }

        assert_equal 0.0, row["total_received_kg"]
      end

      test "取引先ごとの差分一覧が取得できる" do
        sign_in @staff
        iron = Material.create!(name: "鉄_#{SecureRandom.hex(4)}", display_order: 1)
        worker = Staff.create!(username: "w_#{SecureRandom.hex(4)}", name: "作業者", role: "staff", password: "password1234")
        slip = PurchaseSlip.create!(company: @supplier, received_at: Time.zone.now, declared_total_kg: 100.0)
        ProductionRecord.create!(recorded_at: Time.zone.now, material: iron, staff: worker, weight_kg: 105.0, purchase_slip: slip, status: "published")

        get "/api/v1/companies/#{@supplier.id}/variances"
        assert_response :success
        body = JSON.parse(response.body)

        assert_equal 1, body["data"].size
        assert_equal 5.0, body["data"].first["variance_kg"]
      end
    end
  end
end
