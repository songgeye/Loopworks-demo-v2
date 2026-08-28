require "test_helper"

module Api
  module V1
    class MaterialsControllerTest < ActionDispatch::IntegrationTest
      include Devise::Test::IntegrationHelpers

      setup do
        @staff = Staff.create!(username: "signed_in_#{SecureRandom.hex(4)}", name: "ログイン担当",
                                role: "staff", password: "password1234")
        @iron = Material.create!(name: "鉄_#{SecureRandom.hex(4)}", display_order: 1, category: :stock)
        @waste = Material.create!(name: "廃棄_#{SecureRandom.hex(4)}", display_order: 2, category: :disposal)
      end

      test "未認証の場合は401が返る" do
        get "/api/v1/materials"
        assert_response :unauthorized
      end

      test "category=stockで絞り込むとstock区分のみ返る" do
        sign_in @staff
        get "/api/v1/materials", params: { category: "stock" }
        body = JSON.parse(response.body)
        ids = body["data"].map { |m| m["id"] }

        assert_includes ids, @iron.id
        refute_includes ids, @waste.id
      end
    end
  end
end
