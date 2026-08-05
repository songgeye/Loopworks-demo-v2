class MaterialsController < ApplicationController
  before_action :set_material, only: [:show, :edit, :update, :destroy]
  before_action :require_admin, only: [:new, :create, :edit, :update, :destroy]

  def index
    @materials = Material.all
  end

  def new
    @material = Material.new
  end

  def create
    @material = Material.new(material_params)
    if @material.save
      redirect_to materials_path, notice: '品目を登録しました'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def show

  end

  def edit
    
  end

  def update
    if @material.update(material_params)
      redirect_to materials_path, notice: '品目を更新しました'
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @material.destroy
    redirect_to materials_path, notice: '品目を削除しました'
  end

  private

  def set_material
    @material = Material.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    redirect_to materials_path, alert: '品目が見つかりません'
  end

  def require_admin
    unless current_staff&.role == 'admin'
      redirect_to materials_path, alert: '権限がありません'
    end
  end

  def material_params
    params.require(:material).permit(:name, :display_order)
  end
end
