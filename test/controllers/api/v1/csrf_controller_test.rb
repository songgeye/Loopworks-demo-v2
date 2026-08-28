require "test_helper"

module Api
  module V1
    class CsrfControllerTest < ActionDispatch::IntegrationTest
      include Devise::Test::IntegrationHelpers

      setup do
        @staff = Staff.create!(username: "signed_in_#{SecureRandom.hex(4)}", name: "ログイン担当",
                                role: "staff", password: "password1234")
        @buyer = Company.create!(name: "買主_#{SecureRandom.hex(4)}", buyer: true)
        @iron = Material.create!(name: "鉄_#{SecureRandom.hex(4)}", display_order: 1, category: :stock)
      end

      test "トークンを取得できる" do
        sign_in @staff
        get "/api/v1/csrf"
        assert_response :success
        assert JSON.parse(response.body)["token"].present?
      end

      # test環境はデフォルトで allow_forgery_protection=false のため、
      # ここだけ本番相当に有効化してOriginチェック無効化(§3.1)が
      # 正しく効いていることを検証する。
      test "別オリジン(Origin)からのリクエストでもCSRFトークンがあれば通る" do
        original = ActionController::Base.allow_forgery_protection
        ActionController::Base.allow_forgery_protection = true
        begin
          sign_in @staff
          get "/api/v1/csrf", headers: { "Origin" => "http://localhost:3001" }
          token = JSON.parse(response.body)["token"]

          post "/api/v1/shipments",
               params: {
                 shipment: {
                   company_id: @buyer.id, shipped_at: Time.zone.now.iso8601,
                   shipment_items_attributes: [ { material_id: @iron.id, quantity_kg: 1 } ]
                 }
               }.to_json,
               headers: {
                 "Origin" => "http://localhost:3001",
                 "X-CSRF-Token" => token,
                 "Content-Type" => "application/json"
               }

          assert_response :created
        ensure
          ActionController::Base.allow_forgery_protection = original
        end
      end

      test "別オリジンからでもCSRFトークンが無ければ拒否される" do
        original = ActionController::Base.allow_forgery_protection
        ActionController::Base.allow_forgery_protection = true
        begin
          sign_in @staff

          post "/api/v1/shipments",
               params: {
                 shipment: {
                   company_id: @buyer.id, shipped_at: Time.zone.now.iso8601,
                   shipment_items_attributes: [ { material_id: @iron.id, quantity_kg: 1 } ]
                 }
               }.to_json,
               headers: { "Origin" => "http://localhost:3001", "Content-Type" => "application/json" }

          assert_response :unprocessable_entity
        ensure
          ActionController::Base.allow_forgery_protection = original
        end
      end
    end
  end
end
