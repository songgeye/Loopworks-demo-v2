module Api
  module V1
    class BaseController < ApplicationController
      skip_before_action :authenticate_staff!
      before_action :require_staff!

      # Next.js フロントは別オリジン(別ポート)から呼ぶため、Origin ヘッダの
      # 一致チェックは無効化する。CSRF トークン自体の検証(X-CSRF-Token)は
      # 有効なままにする(実装仕様書 v2 §3.1)。
      self.forgery_protection_origin_check = false

      rescue_from ActiveRecord::RecordNotFound, with: :render_not_found

      private

      # Devise の authenticate_staff! はナビゲーション用フォーマット以外でも
      # レスポンス内容が仕様（§3.2 のエラー形式）と一致しないため、
      # API 用に 401 の JSON を明示的に返す。
      def require_staff!
        return if current_staff

        render json: { errors: [ { field: nil, message: "認証が必要です" } ] }, status: :unauthorized
      end

      def render_not_found
        render json: { errors: [ { field: nil, message: "見つかりません" } ] }, status: :not_found
      end

      # BigDecimal はデフォルトで to_json 時に文字列化されるため、明示的に数値へ変換する
      # （実装仕様書 v2 §3.2「重量は数値型。文字列にしない」）。
      def numeric(value)
        value.nil? ? nil : value.to_f
      end

      def error_details(record)
        record.errors.map { |error| { field: error.attribute.to_s, message: error.message } }
      end

      def pagination_meta(scope)
        {
          current_page: scope.current_page,
          total_pages: scope.total_pages,
          total_count: scope.total_count
        }
      end
    end
  end
end
