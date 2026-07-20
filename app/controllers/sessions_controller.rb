class SessionsController < ApplicationController
  skip_before_action :require_login

  def new
  end

  def create
    staff = Staff.find_by(login_id: params[:login_id])
    if staff&.authenticate(params[:password])
      session[:staff_id] = staff.id
      redirect_to root_path, notice: 'ログインしました'
    else
      flash.now[:alert] = 'ログインIDまたはパスワードが正しくありません'
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    session.delete(:staff_id)
    redirect_to login_path, notice: 'ログアウトしました'
  end
end
