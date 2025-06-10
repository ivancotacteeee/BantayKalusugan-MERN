import { useFormContext } from "react-hook-form";

export function RegisterFields() {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <InputField 
          id="firstName"
          label="First Name"
          type="text"
          placeholder="Juan"
          register={register}
          required
          error={errors.firstName}
        />
        <InputField 
          id="lastName"
          label="Last Name"
          type="text"
          placeholder="Dela Cruz"
          register={register}
          required
          error={errors.lastName}
        />
      </div>

      <div>
        <InputField 
          id="email"
          label="Email"
          type="email"
          placeholder="juan@example.com"
          register={register}
          required
          error={errors.email}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InputField 
          id="age"
          label="Age"
          type="number"
          min="0"
          placeholder="28"
          register={register}
          required
          error={errors.age}
        />
        <InputField 
          id="contactNumber"
          label="Contact"
          type="tel"
          placeholder="09123456789"
          register={register}
          required
          error={errors.contactNumber}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="gender">
          Gender
        </label>
        <select
          id="gender"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none bg-white bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM0OTUwNTciIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmUgcG9pbnRzPSI2IDkgMTIgMTUgMTggOSI+PC9wb2x5bGluZT48L3N2Zz4=')] bg-no-repeat bg-[right_1rem_center]"
          {...register("gender", { required: "Gender is required" })}
        >
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          className="w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white font-medium rounded-lg shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        >
          Create Health Account
        </button>
      </div>
    </div>
  );
}

function InputField({ id, label, type, placeholder, register, required, error, min }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        min={min}
        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        placeholder={placeholder}
        {...register(id, { required: required ? `${label} is required` : false })}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
    </div>
  );
}