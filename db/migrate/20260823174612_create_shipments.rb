class CreateShipments < ActiveRecord::Migration[7.2]
  def change
    create_table :shipments do |t|
      t.references :company, null: false, foreign_key: true
      t.datetime :shipped_at, null: false
      t.string :slip_no
      t.text :note
      t.datetime :deleted_at

      t.timestamps
    end
    add_index :shipments, :deleted_at

    create_table :shipment_items do |t|
      t.references :shipment, null: false, foreign_key: true
      t.references :material, null: false, foreign_key: true
      t.decimal :quantity_kg, precision: 12, scale: 2, null: false

      t.timestamps
    end
  end
end
