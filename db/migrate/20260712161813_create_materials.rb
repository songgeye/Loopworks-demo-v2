class CreateMaterials < ActiveRecord::Migration[7.2]
  def change
    create_table :materials do |t|
      t.string :name, null: false
      t.integer :display_order, null: false
      t.datetime :deleted_at

      t.timestamps
    end
    add_index :materials, :deleted_at
  end
end
