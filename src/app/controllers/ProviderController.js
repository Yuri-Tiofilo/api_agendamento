import User from '../models/User';
import File from '../models/File';

class ProviderController {
  async index(req, res) {
    // const providers = await User.findAll(); -> retorna todos os usuários
    const providers = await User.findAll({
      where: { provider: true }, // procura aonde tá
      attributes: ['id', 'name', 'email', 'avatar_id'], // apenas os campos que eu quero
      include: [
        {
          model: File,
          as: 'avatar',
          attributes: ['name', 'path', 'url'],
        },
      ], // inclui o model File a resposta
    }); // retorna apenas usuários que são providers

    return res.json(providers);
  }
}

export default new ProviderController();
