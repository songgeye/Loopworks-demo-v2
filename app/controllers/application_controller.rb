class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  # allow_browser versions: :modern
  before_action :require_login

  def require_login
    unless session[:staff_id]
      redirect_to login_path, alert: 'ログインしてください'
    end
  end

  def current_staff
    @current_staff ||= Staff.find(session[:staff_id]) if session[:staff_id]
  end
end
