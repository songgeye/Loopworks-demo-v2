class CreatePurchaseSlips < ActiveRecord::Migration[7.2]
  def change
    create_table :purchase_slips do |t|
      t.references :company, null: false, foreign_key: true
      t.references :contact, null: true, foreign_key: { to_table: :purchasers }
      t.datetime :received_at, null: false
      t.string :slip_no
      t.decimal :declared_total_kg, precision: 10, scale: 2
      t.text :note
      t.datetime :deleted_at

      t.timestamps
    end
    add_index :purchase_slips, :deleted_at
    add_index :purchase_slips, [ :company_id, :received_at ]
  end
end
