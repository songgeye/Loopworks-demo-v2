class AddPurchaseSlipToProductionRecords < ActiveRecord::Migration[7.2]
  def change
    add_reference :production_records, :purchase_slip, null: true, foreign_key: true
  end
end
