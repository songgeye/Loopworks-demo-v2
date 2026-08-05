class ProductionRecordsController < ApplicationController
  skip_before_action :authenticate_staff!
  before_action :set_production_record, only: [:show, :edit, :update, :destroy]
  before_action :require_admin, only: [:destroy]

  def index
    @production_records = ProductionRecord.all.order(recorded_at: :desc)
  end

  def new
    @production_record = ProductionRecord.new
    @staffs = Staff.all
    @materials = Material.all
  end

  def create
    @production_record = ProductionRecord.new(production_record_params)
    if @production_record.save
      redirect_to production_records_path, notice: '生産記録を登録しました'
    else
      @staffs = Staff.all
      @materials = Material.all
      render :new, status: :unprocessable_entity
    end
  end

    def show
  end

  def edit
  end

  def update
    if @production_record.update(production_record_params)
      redirect_to production_records_path, notice: '生産記録を更新しました'
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @production_record.destroy
    redirect_to production_records_path, notice: '生産記録を削除しました'
  end

  private

  def require_admin
    unless current_staff&.role == 'admin'
      redirect_to production_records_path, alert: '権限がありません'
    end
  end

  def set_production_record
    @production_record = ProductionRecord.find(params[:id])
  end

  def production_record_params
    params.require(:production_record).permit(:recorded_at, :material_id, :weight_kg, :status, :note, :staff_id)
  end

end
