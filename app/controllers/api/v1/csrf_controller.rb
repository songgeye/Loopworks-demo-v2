module Api
  module V1
    class CsrfController < BaseController
      # フロントエンドは起動時にこれを取得し、以降の状態変更リクエストへ
      # X-CSRF-Token ヘッダとして付与する（実装仕様書 v2 §3.1）。
      def show
        render json: { token: form_authenticity_token }
      end
    end
  end
end
