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
    @purchase_slips = PurchaseSlip.order(received_at: :desc).limit(50)
  end

  def create
    @production_record = ProductionRecord.new(production_record_params)
    saved = ActiveRecord::Base.transaction do
      next false unless @production_record.save

      Inventory::RecordPurchase.sync!(@production_record, created_by: inventory_actor)
      true
    end

    if saved
      redirect_to production_records_path, notice: '生産記録を登録しました'
    else
      @staffs = Staff.all
      @materials = Material.all
      @purchase_slips = PurchaseSlip.order(received_at: :desc).limit(50)
      render :new, status: :unprocessable_entity
    end
  end

    def show
  end

  def edit
    @staffs = Staff.all
    @materials = Material.all
    @purchase_slips = PurchaseSlip.order(received_at: :desc).limit(50)
  end

  def update
    saved = ActiveRecord::Base.transaction do
      next false unless @production_record.update(production_record_params)

      Inventory::RecordPurchase.sync!(@production_record, created_by: inventory_actor)
      true
    end

    if saved
      redirect_to production_records_path, notice: '生産記録を更新しました'
    else
      @staffs = Staff.all
      @materials = Material.all
      @purchase_slips = PurchaseSlip.order(received_at: :desc).limit(50)
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    ActiveRecord::Base.transaction do
      Inventory::RecordPurchase.reverse!(@production_record, created_by: inventory_actor)
      @production_record.destroy!
    end
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
    params.require(:production_record).permit(:recorded_at, :material_id, :weight_kg, :status, :note, :staff_id, :purchase_slip_id)
  end

  # このコントローラは未ログインでも利用できる(現場のタブレット等を想定)ため、
  # 未ログイン時は記録自体の作業者を在庫移動の記録者として扱う。
  def inventory_actor
    current_staff || @production_record.staff
  end

end
