class CreateInventoryMovements < ActiveRecord::Migration[7.2]
  def change
    create_table :inventory_movements do |t|
      t.references :material, null: false, foreign_key: true
      t.integer :movement_type, null: false
      t.decimal :quantity_kg, precision: 12, scale: 2, null: false
      t.datetime :occurred_at, null: false
      t.references :source, polymorphic: true, null: true
      t.text :note
      t.references :created_by, null: false, foreign_key: { to_table: :staffs }

      t.timestamps
    end
    add_index :inventory_movements, [ :material_id, :occurred_at ]
  end
end
