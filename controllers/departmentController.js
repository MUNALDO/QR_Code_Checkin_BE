import { BAD_REQUEST, CONFLICT, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import CarSchema from "../models/CarSchema.js";
import DepartmentSchema from "../models/DepartmentSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import { createError } from "../utils/error.js";

export const createDepartment = async (req, res, next) => {
    try {
        const newDepartment = new DepartmentSchema({
            ...req.body,
        });

        await newDepartment.save();
        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newDepartment,
        });
    } catch (err) {
        next(err);
    }
};

export const getAllDepartments = async (req, res, next) => {
    try {
        const departments = await DepartmentSchema.find();
        if (!departments) return next(createError(NOT_FOUND, "Department not found!"))

        res.status(OK).json(departments)
    } catch (err) {
        next(err);
    }
};

export const getDepartmentByName = async (req, res, next) => {
    const department_name = req.query.name;
    try {
        const department = await DepartmentSchema.findOne({ name: department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: department,
        });
    } catch (err) {
        next(err);
    }
};

export const getDepartmentSpecific = async (req, res, next) => {
    const query = req.query.query;
    try {
        if (!query) {
            const department = await DepartmentSchema.find();
            res.status(OK).json({
                success: true,
                status: OK,
                message: department,
            });
        }
        const regex = new RegExp(query, 'i');
        const departmentName = await DepartmentSchema.find({ name: regex });

        if (departmentName.length !== 0) {
            res.status(OK).json({
                success: true,
                status: OK,
                message: departmentName,
            });
        } else {
            res.status(OK).json({
                success: true,
                status: OK,
                message: [],
            });
        }
    } catch (err) {
        next(err);
    }
};

export const updateDepartment = async (req, res, next) => {
    const department_name = req.query.name;
    try {
        const department = await DepartmentSchema.findOne({ name: department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"));

        Object.assign(department, req.body);
        await department.save();

        const employees = await EmployeeSchema.find({ "department.name": department_name });

        for (const employee of employees) {
            const departmentIndex = employee.department.findIndex(d => d.name === department_name);
            if (departmentIndex !== -1) {
                employee.department[departmentIndex] = {
                    ...employee.department[departmentIndex],
                    ...req.body,
                };
            }

            await employee.save();
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: department,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteDepartmentByName = async (req, res, next) => {
    const department_name = req.query.name;
    try {
        const department = await DepartmentSchema.findOne({ name: department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"))

        await DepartmentSchema.findOneAndDelete({ name: department_name });
        res.status(OK).json({
            success: true,
            status: OK,
            message: "Department was deleted successfully",
        });
    } catch (err) {
        next(err);
    }
};

export const addMemberDepartment = async (req, res, next) => {
    const department_name = req.params.name;
    const employeeID = req.body.employeeID;
    const employeeName = req.body.employeeName;
    try {
        const department = await DepartmentSchema.findOne({ name: department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"))

        const employee = await EmployeeSchema.findOne({ id: employeeID, name: employeeName });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        // if (department.members.includes(employee)) return next(createError(CONFLICT, "Employee already exists in the department!"));
        const departmentObject = {
            name: department_name,
            position: req.body.position
        }

        department.members.push({
            id: employee.id,
            name: employee.name,
            email: employee.email,
            role: employee.role,
            position: departmentObject.position,
            status: employee.status
        });
        employee.department.push(departmentObject);

        const updateDepartment = await department.save();
        const updateEmployee = await employee.save();

        res.status(OK).json({
            success: true,
            status: OK,
            message: updateDepartment, updateEmployee
        });
    } catch (err) {
        next(err);
    }
};

export const removeMemberDepartment = async (req, res, next) => {
    const department_name = req.params.name;
    const employeeID = req.body.employeeID;
    const employeeName = req.body.employeeName;
    try {
        const department = await DepartmentSchema.findOne({ name: department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID, name: employeeName });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        if (!department.members.some(member => member.id === employeeID && member.name === employeeName)) {
            return next(createError(NOT_FOUND, "Employee not a member of the department!"));
        }

        department.members = department.members.filter(member => member.id !== employeeID);

        employee.department = employee.department.filter(dep => dep.name !== department_name);

        // Save the updated department and employee
        const updatedDepartment = await department.save();
        const updatedEmployee = await employee.save();

        res.status(OK).json({
            success: true,
            status: OK,
            message: { updatedDepartment, updatedEmployee }
        });
    } catch (err) {
        next(err);
    }
};

export const createCar = async (req, res, next) => {
    const carDepartmentNames = req.body.department_name;
    try {
        const departments = await DepartmentSchema.find({
            name: { $in: carDepartmentNames }
        });

        if (!departments) {
            return next(createError(NOT_FOUND, "One or more departments not found!"));
        }

        for (const department of departments) {
            if (department.cars.some(car => car.name === req.body.name)) {
                return next(createError(CONFLICT, `Car already exists in department ${department.name}!`));
            }
        }

        const newCar = new CarSchema({
            ...req.body,
            department_name: carDepartmentNames,
            register_date: new Date(req.body.register_date)
        });

        for (const department of departments) {
            department.cars.push({
                _id: newCar._id,
                name: newCar.car_name,
                number: newCar.car_number,
                department_name: department.name,
                register_date: newCar.register_date
            });
            await department.save();
        }

        await newCar.save();
        return res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newCar,
        });
    } catch (err) {
        next(err);
    }
}

export const getCar = async (req, res, next) => {
    try {
        const { car_name, car_number, department_name } = req.query;

        if (department_name) {
            const department = await DepartmentSchema.findOne({ name: department_name });
            if (!department) {
                return next(createError(NOT_FOUND, "Department not found!"));
            }

            const cars = department.cars.filter(car => {
                const matchesCarName = car_name ? (car.name && car.name.match(new RegExp(car_name, 'i'))) : true;
                const matchesCarNumber = car_number ? (car.number && car.number.match(new RegExp(car_number, 'i'))) : true;
                return matchesCarName && matchesCarNumber;
            });

            if (!cars || cars.length === 0) {
                return next(createError(NOT_FOUND, "No cars found."));
            }

            return res.status(OK).json({
                success: true,
                status: OK,
                message: cars,
            });
        } else {
            let query = {};
            if (car_number) query.car_number = { $regex: new RegExp(car_number, 'i') };
            if (car_name) query.car_name = { $regex: new RegExp(car_name, 'i') };

            const cars = await CarSchema.find(query);
            if (!cars || cars.length === 0) {
                return next(createError(NOT_FOUND, "No cars found."));
            }

            return res.status(OK).json({
                success: true,
                status: OK,
                message: cars,
            });
        }
    } catch (err) {
        next(err);
    }
};

export const getCarById = async (req, res, next) => {
    const carID = req.params.carID;
    try {
        const car = await CarSchema.findById(carID);
        if (!car) return next(createError(NOT_FOUND, "Car not found!"));

        return res.status(OK).json({
            success: true,
            status: OK,
            message: car,
        });
    } catch (err) {
        next(err);
    }
}

export const updateCarById = async (req, res, next) => {
    const carID = req.params.carID;
    try {
        const car = await CarSchema.findById(carID);
        if (!car) return next(createError(NOT_FOUND, "Car not found!"));

        Object.assign(car, req.body);
        await car.save();

        const departments = await DepartmentSchema.find({
            cars: {
                $elemMatch: { _id: car._id }
            }
        });

        for (const department of departments) {
            const carIndex = department.cars.findIndex(c => c._id ? c._id.toString() === carID : false);
            if (carIndex !== -1) {
                department.cars[carIndex].name = car.car_name;
                department.cars[carIndex].number = car.car_number;
                department.cars[carIndex].department_name = department.name;
                department.cars[carIndex].register_date = car.register_date;

                department.markModified('cars');
                await department.save();
            } else {
                console.log("Err!");
            }
        }

        return res.status(OK).json({
            success: true,
            status: OK,
            message: car,
        });
    } catch (err) {
        next(err);
    }
};

export const addCarToDepartment = async (req, res, next) => {
    const { departmentName, carID } = req.params;

    try {
        const department = await DepartmentSchema.findOne({ name: departmentName });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"));

        const car = await CarSchema.findById(carID);
        if (!car) return next(createError(NOT_FOUND, "Car not found!"));

        // Check if the car is already in the department
        if (department.cars.find(c => c.number === car.car_number)) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Car already in the department",
            });
        }

        department.cars.push({
            _id: carID,
            name: car.car_name,
            number: car.car_number,
            department_name: department.name,
            register_date: car.register_date
        });
        await department.save();

        car.department_name.push(department.name);
        await car.save();

        return res.status(OK).json({
            success: true,
            status: OK,
            message: "Car added to department successfully",
            value: department.cars
        });
    } catch (err) {
        next(err);
    }
};

export const removeCarFromDepartment = async (req, res, next) => {
    const { departmentName, carID } = req.params;

    try {
        const department = await DepartmentSchema.findOne({ name: departmentName });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"));

        const car = await CarSchema.findById(carID);
        if (!car) return next(createError(NOT_FOUND, "Car not found!"));

        const carIndex = department.cars.find(c => c.number === car.car_number);
        if (!carIndex) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Car not found in department",
            });
        }

        department.cars = department.cars.filter(c => c.number !== car.car_number)
        await department.save();

        car.department_name = car.department_name.filter(dep => dep !== department.name);
        await car.save();

        return res.status(OK).json({
            success: true,
            status: OK,
            message: "Car removed from department successfully",
            value: department.cars
        });
    } catch (err) {
        next(err);
    }
};

// export const updateCarByCarNumber = async (req, res, next) => {
//     const { car_number } = req.params;
//     try {
//         const car = await CarSchema.findOne({ car_number: car_number });
//         if (!car) return next(createError(NOT_FOUND, "Car not found!"));

//         Object.assign(car, req.body);
//         await car.save();

//         const departments = await DepartmentSchema.find({
//             'cars.number': car_number
//         });

//         for (const department of departments) {
//             const carIndex = department.cars.findIndex(c => c.number === car_number);
//             if (carIndex !== -1) {
//                 department.cars[carIndex] = {
//                     name: car.car_name,
//                     number: car.car_number,
//                     department_name: department.name,
//                     register_date: car.register_date
//                 };
//                 await department.save();
//             }
//         }

//         return res.status(OK).json({
//             success: true,
//             status: OK,
//             message: car,
//         });
//     } catch (err) {
//         next(err);
//     }
// };

export const deleteCar = async (req, res, next) => {
    const { car_number } = req.params;
    try {
        const car = await CarSchema.findOneAndDelete({ car_number: car_number });
        if (!car) {
            return next(createError(NOT_FOUND, "Car not found!"));
        }

        const departments = await DepartmentSchema.find({
            'cars.number': car_number
        });

        for (const department of departments) {
            department.cars = department.cars.filter(c => c.number !== car_number);
            await department.save();
        }

        return res.status(OK).json({
            success: true,
            status: OK,
            message: `Car ${car_number} deleted successfully`,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteCarById = async (req, res, next) => {
    const carID = req.params.carID;
    try {
        const car = await CarSchema.findById(carID);
        if (!car) return next(createError(NOT_FOUND, "Car not found!"));

        const departments = await DepartmentSchema.find({
            'cars.number': car.car_number
        });

        for (const department of departments) {
            department.cars = department.cars.filter(c => c.number !== car.car_number);
            await department.save();
        }

        await CarSchema.findByIdAndDelete(carID);
        return res.status(OK).json({
            success: true,
            status: OK,
            message: `Car ${car.car_number} deleted successfully`,
        });
    } catch (err) {
        next(err);
    }
};