class CreateProductionRecords < ActiveRecord::Migration[7.2]
  def change
    create_table :production_records do |t|
      t.datetime :recorded_at, null: false
      t.references :material, null: false, foreign_key: true
      t.decimal :weight_kg, null: false
      t.references :staff, null: false, foreign_key: true
      t.string :status, null: false, default: 'published'
      t.text :note
      t.boolean :flagged_as_anomaly, null: false, default: false
      t.datetime :deleted_at

      t.timestamps
    end
    add_index :production_records, :recorded_at
    add_index :production_records, :status
    add_index :production_records, :deleted_at
  end
end
