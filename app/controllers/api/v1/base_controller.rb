module Api
  module V1
    class BaseController < ApplicationController
      skip_before_action :authenticate_staff!
      before_action :require_staff!

      private

      # Devise の authenticate_staff! はナビゲーション用フォーマット以外でも
      # レスポンス内容が仕様（§3.2 のエラー形式）と一致しないため、
      # API 用に 401 の JSON を明示的に返す。
      def require_staff!
        return if current_staff

        render json: { errors: [ { field: nil, message: "認証が必要です" } ] }, status: :unauthorized
      end
    end
  end
end
