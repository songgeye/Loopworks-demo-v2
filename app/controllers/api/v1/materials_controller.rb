module Api
  module V1
    class MaterialsController < BaseController
      def index
        materials = Material.all
        materials = materials.where(category: params[:category]) if params[:category].present?
        materials = materials.order(:display_order).page(params[:page])

        render json: {
          data: materials.map { |material| material_json(material) },
          meta: pagination_meta(materials)
        }
      end

      private

      def material_json(material)
        {
          id: material.id,
          name: material.name,
          display_order: material.display_order,
          category: material.category
        }
      end
    end
  end
end
