class AddCategoryToMaterials < ActiveRecord::Migration[7.2]
  def change
    add_column :materials, :category, :integer, null: false, default: 0
  end
end
