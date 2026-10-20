import React from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Props {
  onNext: () => void;
}

export const FleetProfileStep = ({ onNext }: Props) => {
  const queryClient = useQueryClient();

  // Using TanStack Query for offline-first state
  const { data: fleetData = { plate: "", model: "", year: "" } } = useQuery({
    queryKey: ["onboarding-fleet"],
    queryFn: () => ({ plate: "", model: "", year: "" }),
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: async (newData: any) => newData,
    onSuccess: (data) => {
      queryClient.setQueryData(["onboarding-fleet"], data);
      onNext();
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    mutation.mutate({
      plate: formData.get("plate"),
      model: formData.get("model"),
      year: formData.get("year"),
    });
  };

  return (
    <motion.div
      key="step1-driver"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Perfil de Flota</h2>
        <p className="text-gray-400">
          Ingresa los datos del vehículo donde instalarás la tablet.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Placa del Vehículo
          </label>
          <input
            type="text"
            name="plate"
            defaultValue={fleetData.plate}
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all uppercase"
            placeholder="A123456"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Modelo
            </label>
            <input
              type="text"
              name="model"
              defaultValue={fleetData.model}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="Ej. Hyundai Sonata"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Año
            </label>
            <input
              type="number"
              name="year"
              min="2000"
              max={new Date().getFullYear() + 1}
              defaultValue={fleetData.year}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="2018"
            />
          </div>
        </div>

        <div className="pt-8 mt-auto flex justify-end">
          <button
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25"
          >
            Continuar
          </button>
        </div>
      </form>
    </motion.div>
  );
};
