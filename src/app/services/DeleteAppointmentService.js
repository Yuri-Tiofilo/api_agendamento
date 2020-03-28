import { isBefore, subHours } from 'date-fns';
import Appointment from '../models/Appointment';
import User from '../models/User';
import Queue from '../../lib/Queue';
import CancelationMail from '../jobs/CancellationMail';

class DeleteAppointmentService {
  async run({ provider_id, user_id }) {
    const appointment = await Appointment.findByPk(provider_id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });
    const checkUserProvider = await User.findOne({
      where: { id: user_id, provider: true },
    });
    if (checkUserProvider) {
      throw new Error('User is a provider.');
    }

    if (appointment.user_id !== user_id) {
      throw new Error("You don't have permission to cancel this appointment");
      // return res.status(401).json({
      //   error: "You don't have permission to cancel this appointment",
      // });
    }

    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      throw new Error('You can only cancel appointments 2 hours in advance');
    }

    appointment.canceled = new Date();

    await appointment.save();

    await Queue.add(CancelationMail.key, {
      appointment,
    });
    return appointment;
  }
}
export default new DeleteAppointmentService();
