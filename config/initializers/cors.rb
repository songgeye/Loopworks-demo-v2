# /api 配下のみを対象にした CORS 設定（loopworks_implementation_spec_v2.md §3.1）。
# FRONTEND_ORIGIN が未設定の環境（開発・テストの初期状態）では何もしない。
if ENV["FRONTEND_ORIGIN"].present?
  Rails.application.config.middleware.insert_before 0, Rack::Cors do
    allow do
      origins ENV.fetch("FRONTEND_ORIGIN")
      resource "/api/*",
        headers: :any,
        methods: %i[get post patch put delete options],
        credentials: true,
        expose: [ "Content-Disposition" ]
    end
  end
end
