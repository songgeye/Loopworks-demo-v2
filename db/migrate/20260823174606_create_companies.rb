class CreateCompanies < ActiveRecord::Migration[7.2]
  def change
    create_table :companies do |t|
      t.string :name, null: false
      t.boolean :supplier, null: false, default: false
      t.boolean :buyer, null: false, default: false
      t.datetime :deleted_at

      t.timestamps
    end
    add_index :companies, :deleted_at
    add_index :companies, :supplier
    add_index :companies, :buyer
  end
end
