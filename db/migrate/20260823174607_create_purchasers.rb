class CreatePurchasers < ActiveRecord::Migration[7.2]
  def change
    create_table :purchasers do |t|
      t.references :company, null: false, foreign_key: true
      t.string :name, null: false
      t.datetime :deleted_at

      t.timestamps
    end
    add_index :purchasers, :deleted_at
  end
end
